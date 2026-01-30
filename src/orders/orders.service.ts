import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { GetOrdersQueryDto } from "./dto/get-orders-query.dto";
import { BulkUpdateDto, BulkUpdateResponse } from "./dto/bulk-update.dto";
import { Order } from "./entities/order.entity";
import { PaginatedResponse } from "../common/interfaces/pagination.interface";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: GetOrdersQueryDto): Promise<PaginatedResponse<Order>> {
    const {
      status,
      customerId,
      startDate,
      endDate,
      limit = 20,
      cursor,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    // Build where clause for filtering
    const where: any = {
      deletedAt: null, // Exclude soft-deleted orders
      ...(status && { status }),
      ...(customerId && { customerId }),
    };

    // Add date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Fetch orders with pagination
    const orders = await this.prisma.order.findMany({
      where,
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      orderBy,
    });

    const hasMore = orders.length > limit;
    const data = hasMore ? orders.slice(0, -1) : orders;

    return {
      data: data as any,
      pagination: {
        nextCursor: hasMore ? data[data.length - 1].id : null,
        prevCursor: cursor || null,
        hasMore,
        total: await this.prisma.order.count({ where }),
      },
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order as any;
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Validate items array is not empty (extra safety check)
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException("Order must have at least one item");
    }

    // Calculate item totals and add to each item
    const itemsWithTotal = createOrderDto.items.map((item) => ({
      ...item,
      total: item.price * item.quantity,
    }));

    // Calculate subtotal from items
    const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);

    // Get shipping fee (default to 0 if not provided)
    const shippingFee = createOrderDto.shippingFee || 0;

    // Calculate total
    const total = subtotal + shippingFee;

    try {
      const order = await this.prisma.order.create({
        data: {
          customerId: createOrderDto.customerId,
          items: itemsWithTotal,
          subtotal,
          shippingFee,
          total,
          shippingAddress: createOrderDto.shippingAddress,
          note: createOrderDto.note,
        } as any,
      });

      return order as any;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          `Failed to create order: ${error.message}`,
        );
      }
      throw error;
    }
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    // Check if order exists
    const existingOrder = await this.findOne(id);

    // Validate status transitions if status is being updated
    if (updateOrderDto.status) {
      this.validateStatusTransition(
        existingOrder.status as any,
        updateOrderDto.status,
      );
    }

    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: {
          ...(updateOrderDto.status && {
            status: updateOrderDto.status as any,
          }),
          ...(updateOrderDto.shippingAddress && {
            shippingAddress: updateOrderDto.shippingAddress as any,
          }),
          ...(updateOrderDto.note !== undefined && {
            note: updateOrderDto.note,
          }),
        },
      });
      return order as any;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          `Failed to update order: ${error.message}`,
        );
      }
      throw error;
    }
  }

  // DELIVERED and CANCELLED are final states (cannot be changed)
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    // If status is not changing, allow it
    if (currentStatus === newStatus) {
      return;
    }

    // DELIVERED is a final state - cannot change to any other status
    if (currentStatus === "DELIVERED") {
      throw new BadRequestException(
        `Order is already DELIVERED and cannot be changed to ${newStatus}`,
      );
    }

    // CANCELLED is a final state - cannot change to any other status
    if (currentStatus === "CANCELLED") {
      throw new BadRequestException(
        `Cancelled orders cannot be changed to ${newStatus}`,
      );
    }

    // Cannot move backwards in the workflow
    const statusOrder = {
      PENDING: 0,
      CONFIRMED: 1,
      PROCESSING: 2,
      SHIPPED: 3,
      DELIVERED: 4,
    };

    const currentOrder = statusOrder[currentStatus];
    const newOrder = statusOrder[newStatus];

    // Allow moving to CANCELLED from any non-final state
    if (newStatus === "CANCELLED") {
      return;
    }

    // Prevent moving backwards (e.g., SHIPPED -> PROCESSING)
    if (
      currentOrder !== undefined &&
      newOrder !== undefined &&
      newOrder < currentOrder
    ) {
      throw new BadRequestException(
        `Cannot move order backwards from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    // Check if order exists
    await this.findOne(id);

    // Soft delete
    await this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async bulkUpdate(bulkUpdateDto: BulkUpdateDto): Promise<BulkUpdateResponse> {
    const success: string[] = [];
    const failed: { id: string; reason: string }[] = [];

    // Validate orderIds array is not empty
    if (!bulkUpdateDto.orderIds || bulkUpdateDto.orderIds.length === 0) {
      throw new BadRequestException("Must provide at least one order ID");
    }

    // Check all orders exist and are not deleted
    const existingOrders = await this.prisma.order.findMany({
      where: {
        id: { in: bulkUpdateDto.orderIds },
        deletedAt: null,
      },
      select: { id: true, status: true },
    });

    const existingOrderMap = new Map(
      existingOrders.map((order) => [order.id, order.status]),
    );

    // Identify missing or deleted orders, and validate status transitions
    for (const orderId of bulkUpdateDto.orderIds) {
      const currentStatus = existingOrderMap.get(orderId);

      if (!currentStatus) {
        failed.push({
          id: orderId,
          reason: "Order not found or has been deleted",
        });
        continue;
      }

      // Validate status transition for each order
      try {
        this.validateStatusTransition(
          currentStatus as string,
          bulkUpdateDto.status,
        );
      } catch (error) {
        failed.push({
          id: orderId,
          reason: error.message || "Invalid status transition",
        });
      }
    }

    // Update only the valid orders (those not in failed array)
    const failedIds = new Set(failed.map((f) => f.id));
    const validOrderIds = bulkUpdateDto.orderIds.filter(
      (id) => existingOrderMap.has(id) && !failedIds.has(id),
    );

    if (validOrderIds.length > 0) {
      try {
        // Bulk update all valid orders in a single transaction
        await this.prisma.order.updateMany({
          where: {
            id: { in: validOrderIds },
          },
          data: {
            status: bulkUpdateDto.status as any,
          },
        });

        success.push(...validOrderIds);
      } catch (error) {
        // If the bulk update fails, mark all valid orders as failed
        const errorMessage =
          error instanceof Prisma.PrismaClientKnownRequestError
            ? `Database error: ${error.message}`
            : error.message || "Update failed";

        for (const orderId of validOrderIds) {
          failed.push({
            id: orderId,
            reason: errorMessage,
          });
        }
      }
    }

    return { success, failed };
  }
}
