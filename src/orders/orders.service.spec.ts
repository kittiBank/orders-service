import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../common/enums/order-status.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockOrders = [
      {
        id: '1',
        customerId: 'customer1',
        items: [],
        subtotal: 100,
        shippingFee: 10,
        total: 110,
        status: OrderStatus.PENDING,
        shippingAddress: {},
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: '2',
        customerId: 'customer1',
        items: [],
        subtotal: 200,
        shippingFee: 10,
        total: 210,
        status: OrderStatus.CONFIRMED,
        shippingAddress: {},
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    // Test: ดึงรายการ orders แบบมี pagination
    it('should return paginated orders', async () => {
      const query = { limit: 20 };
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(mockPrismaService.order.findMany).toHaveBeenCalled();
    });

    // Test: กรอง orders ตาม status
    it('should filter orders by status', async () => {
      const query = { status: OrderStatus.PENDING, limit: 20 };
      const filteredOrders = [mockOrders[0]];
      mockPrismaService.order.findMany.mockResolvedValue(filteredOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PENDING,
          }),
        }),
      );
    });

    // Test: กรอง orders ตาม customer ID
    it('should filter orders by customer ID', async () => {
      const query = { customerId: 'customer1', limit: 20 };
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'customer1',
          }),
        }),
      );
    });

    // Test: กรอง orders ตาม date range
    it('should filter orders by date range', async () => {
      const query = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        limit: 20,
      };
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      await service.findAll(query);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    // Test: ใช้ cursor-based pagination
    it('should handle cursor-based pagination', async () => {
      const query = { cursor: '1', limit: 20 };
      const paginatedOrders = [mockOrders[1]];
      mockPrismaService.order.findMany.mockResolvedValue(paginatedOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      const result = await service.findAll(query);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: '1' },
          skip: 1,
        }),
      );
    });

    // Test: เรียงลำดับ orders ตาม field ที่กำหนด
    it('should sort orders by specified field', async () => {
      const query = { sortBy: 'total' as const, sortOrder: 'asc' as const, limit: 20 };
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(2);

      await service.findAll(query);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { total: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    const mockOrder = {
      id: '1',
      customerId: 'customer1',
      items: [],
      subtotal: 100,
      shippingFee: 10,
      total: 110,
      status: OrderStatus.PENDING,
      shippingAddress: {},
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // Test: ดึง order โดยใช้ ID
    it('should return an order by ID', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOne('1');

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
    });

    // Test: throw error เมื่อหา order ไม่เจอ
    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createOrderDto = {
      customerId: 'customer1',
      items: [
        { productId: 'prod1', quantity: 2, price: 50 },
        { productId: 'prod2', quantity: 1, price: 30 },
      ],
      shippingAddress: {
        name: 'John Doe',
        phone: '0812345678',
        address: '123 Main St',
        province: 'Bangkok',
        postalCode: '10110',
      },
      shippingFee: 20,
      note: 'Test order',
    };

    const mockCreatedOrder = {
      id: '1',
      customerId: 'customer1',
      items: createOrderDto.items,
      subtotal: 130,
      shippingFee: 20,
      total: 150,
      status: OrderStatus.PENDING,
      shippingAddress: createOrderDto.shippingAddress,
      note: 'Test order',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // Test: สร้าง order ใหม่
    it('should create a new order', async () => {
      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

      const result = await service.create(createOrderDto);

      expect(result).toHaveProperty('id');
      expect(result.total).toBe(150);
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });

    // Test: คำนวณ subtotal และ total ถูกต้อง
    it('should calculate subtotal and total correctly', async () => {
      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

      await service.create(createOrderDto);

      const createCall = mockPrismaService.order.create.mock.calls[0][0];
      expect(createCall.data.subtotal).toBe(130); // (50*2) + (30*1)
      expect(createCall.data.total).toBe(150); // 130 + 20
    });

    // Test: throw error เมื่อ items ว่าง
    it('should throw BadRequestException if items array is empty', async () => {
      const invalidDto = { ...createOrderDto, items: [] };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.order.create).not.toHaveBeenCalled();
    });

    // Test: ใช้ shipping fee เป็น 0 ถ้าไม่ระบุ
    it('should use default shipping fee of 0 if not provided', async () => {
      const dtoWithoutShippingFee = { ...createOrderDto };
      delete dtoWithoutShippingFee.shippingFee;

      const orderWithoutShippingFee = {
        ...mockCreatedOrder,
        shippingFee: 0,
        total: 130,
      };
      mockPrismaService.order.create.mockResolvedValue(orderWithoutShippingFee);

      await service.create(dtoWithoutShippingFee);

      const createCall = mockPrismaService.order.create.mock.calls[0][0];
      expect(createCall.data.shippingFee).toBe(0);
    });
  });

  describe('update', () => {
    const mockOrder = {
      id: '1',
      customerId: 'customer1',
      items: [],
      subtotal: 100,
      shippingFee: 10,
      total: 110,
      status: OrderStatus.PENDING,
      shippingAddress: {},
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // Test: อัพเดท order
    it('should update an order', async () => {
      const updateDto = { status: OrderStatus.CONFIRMED };
      const updatedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };

      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.update('1', updateDto);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: OrderStatus.CONFIRMED },
      });
    });

    // Test: throw error เมื่อพยายาม update order ที่ไม่มี
    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.update('999', { status: OrderStatus.CONFIRMED })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });

    // Test: throw error เมื่อเปลี่ยน status ไม่ถูกต้อง
    it('should throw BadRequestException for invalid status transition', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      mockPrismaService.order.findFirst.mockResolvedValue(deliveredOrder);

      await expect(
        service.update('1', { status: OrderStatus.PENDING }),
      ).rejects.toThrow(BadRequestException);
    });

    // Test: อนุญาตให้เปลี่ยนเป็น CANCELLED ได้จากทุก state ยกเว้น final state
    it('should allow transition to CANCELLED from any non-final state', async () => {
      const processingOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
      const cancelledOrder = { ...processingOrder, status: OrderStatus.CANCELLED };

      mockPrismaService.order.findFirst.mockResolvedValue(processingOrder);
      mockPrismaService.order.update.mockResolvedValue(cancelledOrder);

      const result = await service.update('1', { status: OrderStatus.CANCELLED });

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('remove', () => {
    const mockOrder = {
      id: '1',
      customerId: 'customer1',
      items: [],
      subtotal: 100,
      shippingFee: 10,
      total: 110,
      status: OrderStatus.PENDING,
      shippingAddress: {},
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    // Test: soft delete order
    it('should soft delete an order', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        deletedAt: new Date(),
      });

      await service.remove('1');

      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    // Test: throw error เมื่อพยายามลบ order ที่ไม่มี
    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.order.update).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdate', () => {
    const mockOrders = [
      { id: '1', status: OrderStatus.PENDING },
      { id: '2', status: OrderStatus.CONFIRMED },
      { id: '3', status: OrderStatus.PENDING },
    ];

    // Test: อัพเดท orders หลายรายการพร้อมกัน
    it('should bulk update valid orders', async () => {
      const bulkUpdateDto = {
        orderIds: ['1', '2', '3'],
        status: OrderStatus.SHIPPED,
      };

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdate(bulkUpdateDto);

      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(mockPrismaService.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2', '3'] } },
        data: { status: OrderStatus.SHIPPED },
      });
    });

    // Test: throw error เมื่อ orderIds ว่าง
    it('should throw BadRequestException if orderIds is empty', async () => {
      const bulkUpdateDto = {
        orderIds: [],
        status: OrderStatus.CONFIRMED,
      };

      await expect(service.bulkUpdate(bulkUpdateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Test: จัดการกับ orders ที่ไม่มีอยู่ใน bulk update
    it('should handle non-existent orders', async () => {
      const bulkUpdateDto = {
        orderIds: ['1', '999', '3'],
        status: OrderStatus.CONFIRMED,
      };

      // Only return orders 1 and 3 (999 doesn't exist)
      mockPrismaService.order.findMany.mockResolvedValue([
        mockOrders[0],
        mockOrders[2],
      ]);
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUpdate(bulkUpdateDto);

      // Both existing orders should succeed (1 and 3)
      expect(result.success).toHaveLength(2);
      expect(result.success).toContain('1');
      expect(result.success).toContain('3');
      // Only order 999 should fail
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('999');
      expect(result.failed[0].reason).toContain('not found');
    });

    // Test: จัดการกับการเปลี่ยน status ที่ไม่ถูกต้องใน bulk update
    it('should handle invalid status transitions in bulk update', async () => {
      const bulkUpdateDto = {
        orderIds: ['1', '2'],
        status: OrderStatus.PENDING,
      };

      const ordersWithDelivered = [
        { id: '1', status: OrderStatus.DELIVERED },
        { id: '2', status: OrderStatus.CONFIRMED },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(ordersWithDelivered);
      mockPrismaService.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkUpdate(bulkUpdateDto);

      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed.some((f) => f.id === '1')).toBe(true);
    });
  });
});
