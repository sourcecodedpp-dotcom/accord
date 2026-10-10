export interface AccordClientConfig {
  baseUrl?: string;
  apiKey?: string;
  sessionToken?: string;
}

export interface HttpRequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, any>;
}
