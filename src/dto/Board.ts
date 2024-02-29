import { IsDefined, Length } from "class-validator";

export class Board {
  @IsDefined()
  @Length(5, 30)
  name: string;
  }