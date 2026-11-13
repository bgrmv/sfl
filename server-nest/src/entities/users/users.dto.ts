import * as v from 'valibot';

// Schema for CreateUserSettingsDto
// export const createUserSettingsSchema = v.object({
//   receiveNotifications: v.boolean().optional(),
//   receiveEmails: v.boolean().optional(),
//   receiveSMS: v.boolean().optional(),
// });

// export type ImageInput = v.Input<typeof ImageSchema>;
// export type ImageOutput = v.Output<typeof ImageSchema>;

// Schema for CreateUserDto
export const UpdateTestUsersDto = v.transform(
  v.object({
    status: v.optional(v.picklist(['public', 'private']), 'private'),
    created: v.optional(v.date(), () => new Date()),
    // title: v.string([v.maxLength(100)]),
    // source: v.string([v.url()]),
    size: v.string(),
  }),
  input => ({
    ...input,
    size: Number(input.size),
  }),
);

export type UpdateTestUsersDtoInput = v.Input<typeof UpdateTestUsersDto>;
export type UpdateTestUsersDtoOutput = v.Output<typeof UpdateTestUsersDto>;
