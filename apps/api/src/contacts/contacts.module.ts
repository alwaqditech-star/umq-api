import { Module } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { ContactsAdminController } from "./contacts-admin.controller";

@Module({
  controllers: [ContactsController, ContactsAdminController],
  providers: [ContactsService],
})
export class ContactsModule {}
