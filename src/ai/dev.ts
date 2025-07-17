import { config } from 'dotenv';
config();

import '@/ai/flows/predict-remaining-life.ts';
import '@/ai/flows/recommend-repairs.ts';