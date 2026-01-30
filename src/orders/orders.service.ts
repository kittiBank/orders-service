import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    // Check if order exists
    await this.findOne(id);

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        ...(updateOrderDto.status && { status: updateOrderDto.status as any }),
        ...(updateOrderDto.shippingAddress && {
          shippingAddress: updateOrderDto.shippingAddress as any,
        }),
        ...(updateOrderDto.note !== undefined && { note: updateOrderDto.note }),
      },
    });
    console.log("Updated order:", order);
    return order as any;
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

    // Check all orders exist and are not deleted
    const existingOrders = await this.prisma.order.findMany({
      where: {
        id: { in: bulkUpdateDto.orderIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    const existingOrderIds = new Set(existingOrders.map((order) => order.id));

    // Identify missing or deleted orders
    for (const orderId of bulkUpdateDto.orderIds) {
      if (!existingOrderIds.has(orderId)) {
        failed.push({
          id: orderId,
          reason: "Order not found or has been deleted",
        });
      }
    }

    // Update only the valid orders
    const validOrderIds = bulkUpdateDto.orderIds.filter((id) =>
      existingOrderIds.has(id),
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
        for (const orderId of validOrderIds) {
          failed.push({
            id: orderId,
            reason: error.message || "Update failed",
          });
        }
      }
    }

    return { success, failed };
  }
}
