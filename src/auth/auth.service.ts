import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RevokeTokenDto } from './dto/revoke-token.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user with role (default to CUSTOMER)
    const user = await this.prismaService.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
        role: registerDto.role || Role.CUSTOMER,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store hashed refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.prismaService.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store hashed refresh token
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
      });

      // Verify stored refresh token
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshTokenDto.refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens (rotation)
      const tokens = await this.generateTokens(payload.sub, payload.email, user.role);

      // Update stored refresh token
      await this.updateRefreshToken(payload.sub, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Clear refresh token from database
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Revoke a specific token by adding it to the blacklist
   */
  async revokeToken(revokeTokenDto: RevokeTokenDto, userId: string) {
    try {
      // Verify and decode the token
      const payload = await this.jwtService.verifyAsync(revokeTokenDto.token, {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      });

      // Check if token belongs to the user
      if (payload.sub !== userId) {
        throw new UnauthorizedException('You can only revoke your own tokens');
      }

      // Hash the token for storage (don't store plain tokens)
      const hashedToken = await bcrypt.hash(revokeTokenDto.token, 10);

      // Calculate expiration time from token
      const expiresAt = new Date(payload.exp * 1000);

      // Add to blacklist
      await this.prismaService.tokenBlacklist.create({
        data: {
          token: hashedToken,
          userId: payload.sub,
          reason: revokeTokenDto.reason || 'Manual revocation',
          expiresAt,
        },
      });

      return {
        message: 'Token revoked successfully',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Revoke all tokens for a specific user
   */
  async revokeAllTokens(userId: string, reason?: string) {
    // Clear refresh token
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    // Note: We can't blacklist all access tokens since we don't store them
    // But we've cleared the refresh token, so they can't get new access tokens
    // Access tokens will naturally expire after 15 minutes

    return {
      message: 'All tokens revoked successfully. You will be logged out from all devices.',
      note: 'Active access tokens will expire within 15 minutes',
    };
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      // Get all blacklisted tokens for efficiency check
      const blacklistedTokens = await this.prismaService.tokenBlacklist.findMany({
        where: {
          expiresAt: {
            gt: new Date(), // Only check non-expired blacklisted tokens
          },
        },
        select: {
          token: true,
        },
      });

      // Check if any hashed token matches
      for (const blacklisted of blacklistedTokens) {
        const isMatch = await bcrypt.compare(token, blacklisted.token);
        if (isMatch) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If there's an error checking blacklist, fail safe and allow the token
      // This prevents service disruption if the blacklist check fails
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens from blacklist (should be run periodically)
   */
  async cleanupExpiredTokens() {
    const result = await this.prismaService.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return {
      message: 'Expired tokens cleaned up',
      deletedCount: result.count,
    };
  }

  private async generateTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
