export interface RealtimeEvent<T = any> {
  event: string;
  payload: T;
}
