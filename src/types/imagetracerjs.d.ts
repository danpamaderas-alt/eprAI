declare module 'imagetracerjs' {
  export interface TracerOptions {
    [key: string]: unknown;
  }

  const ImageTracer: {
    imagedataToSVG(imgd: ImageData, options?: TracerOptions | string): string;
    imageToSVG(
      url: string,
      callback: (svg: string) => void,
      options?: TracerOptions | string,
    ): void;
    optionpresets: Record<string, TracerOptions>;
  };

  export default ImageTracer;
}
