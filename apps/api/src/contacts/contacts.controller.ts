import { Body, Controller, Post } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { Public } from "../common/decorators/public.decorator";
import { CreateContactDto } from "./dto/create-contact.dto";

@Controller("contacts")
@Public()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Body() body: CreateContactDto) {
    return this.contactsService.create(body);
  }
}
