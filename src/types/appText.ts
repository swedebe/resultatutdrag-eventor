
export type AppTextCategory = 'homepage' | 'fileupload' | 'settings' | 'auth' | 'general';

export interface AppText {
  id: string;
  key: string;
  value: string;
  category: AppTextCategory;
  created_at?: string;
  updated_at?: string;
}
