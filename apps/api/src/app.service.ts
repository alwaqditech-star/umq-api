import { Injectable } from "@nestjs/common";
import { UMQ_PLATFORM_NAME } from "@umq/shared";

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: UMQ_PLATFORM_NAME,
      version: "0.1.0",
      phase: 1,
    };
  }
}
