declare module "fluent-ffmpeg-multistream" {
  import { Readable } from "stream";

  export class StreamInput {
    constructor(input: Readable);
    url: string;
  }
}
