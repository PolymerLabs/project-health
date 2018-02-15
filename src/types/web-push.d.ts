type WebPushOptions = {
  TTL?: number;
};

declare module 'web-push' {
  export function setVapidDetails(
      url: string,
      publicKey: string,
      privateKey: string,
      ): void;

  export function sendNotification(
      subscription: object, payload: string, options?: WebPushOptions):
      Promise<void>;
}