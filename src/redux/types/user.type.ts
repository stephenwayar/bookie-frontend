import { UserBook } from "./book.types";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  access_token: string;
  books: UserBook[]
}

export type UserState = {
  value: User | null
}

export enum UserKey {
  BOOKIED_USER = 'bookie-user',
}