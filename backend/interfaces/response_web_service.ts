export interface ResponseWebService<T>{
  isSuccess: boolean,
  hasResults: boolean,
  data: any[],
  errorMessage?: string
  totalCount?: number
}