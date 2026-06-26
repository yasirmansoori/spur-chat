import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
  sessionId: z
    .string()
    .trim()
    .optional()
    .nullable(),
  stream: z
    .boolean()
    .optional()
    .nullable(),
  model: z
    .string()
    .trim()
    .optional()
    .nullable(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
