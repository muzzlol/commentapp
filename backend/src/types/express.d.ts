
import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      id: string;
      [key: string]: any;
    };
  }
}
