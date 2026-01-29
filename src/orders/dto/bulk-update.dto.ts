import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { OrderStatus } from "../../common/enums/order-status.enum";

export class BulkUpdateDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  orderIds: string[];

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class BulkUpdateResponse {
  @ApiProperty({ type: [String] })
  success: string[];

  @ApiProperty({
    type: [Object],
    example: [{ id: "123", reason: "Order not found" }],
  })
  failed: {
    id: string;
    reason: string;
  }[];
}
