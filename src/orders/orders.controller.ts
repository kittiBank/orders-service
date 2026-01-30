import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { GetOrdersQueryDto } from "./dto/get-orders-query.dto";
import { BulkUpdateDto } from "./dto/bulk-update.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@prisma/client";
import { Permission } from "../common/enums/permission.enum";
import { OrderStatus } from "../common/enums/order-status.enum";

@ApiTags("Orders")
@Controller("api/v1/orders")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders with filters and pagination" })
  @ApiResponse({ status: 200, description: "Orders retrieved successfully" })
  async findAll(
    @Query() query: GetOrdersQueryDto,
    @CurrentUser() user: any,
  ) {
    // Admin and Seller can see all orders
    // Customer can only see their own orders
    if (user.role === Role.CUSTOMER) {
      query.customerId = user.id; // Force filter by their own ID
    }
    return this.ordersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single order by ID" })
  @ApiResponse({ status: 200, description: "Order found" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.findOne(id);
    
    // Customer can only view their own orders
    if (user.role === Role.CUSTOMER && order.customerId !== user.id) {
      throw new ForbiddenException('You can only view your own orders');
    }
    
    return order;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create new order" })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    // Customer can only create orders for themselves
    if (user.role === Role.CUSTOMER) {
      createOrderDto.customerId = user.id; // Force customerId to their own ID
    }
    return this.ordersService.create(createOrderDto);
  }

  @Patch("bulk")
  @Roles(Role.ADMIN, Role.SELLER)
  @ApiOperation({ summary: "Bulk update order status" })
  @ApiResponse({ status: 200, description: "Bulk update completed" })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  async bulkUpdate(@Body() bulkUpdateDto: BulkUpdateDto) {
    return this.ordersService.bulkUpdate(bulkUpdateDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update order" })
  @ApiResponse({ status: 200, description: "Order updated successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async update(
    @Param("id") id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    const order = await this.ordersService.findOne(id);
    
    // Customer can only update their own orders and only if status is PENDING
    if (user.role === Role.CUSTOMER) {
      if (order.customerId !== user.id) {
        throw new ForbiddenException('You can only update your own orders');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new ForbiddenException('You can only update orders with PENDING status');
      }
    }
    
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete order" })
  @ApiResponse({ status: 204, description: "Order deleted successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async remove(@Param("id") id: string) {
    return this.ordersService.remove(id);
  }
}
