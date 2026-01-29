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

@ApiTags("Orders")
@Controller("api/v1/orders")
// @UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List orders with filters and pagination" })
  @ApiResponse({ status: 200, description: "Orders retrieved successfully" })
  async findAll(@Query() query: GetOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single order by ID" })
  @ApiResponse({ status: 200, description: "Order found" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async findOne(@Param("id") id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create new order" })
  @ApiResponse({ status: 201, description: "Order created successfully" })
  @ApiResponse({ status: 400, description: "Invalid request data" })
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch("bulk")
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
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft delete order" })
  @ApiResponse({ status: 204, description: "Order deleted successfully" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async remove(@Param("id") id: string) {
    return this.ordersService.remove(id);
  }
}
