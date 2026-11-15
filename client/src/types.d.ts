// Utils

type WithId<T> = T & { id: string };

type FormControls<T> = {
  [key in keyof T]: import('@angular/forms').FormControl<T[key]>;
};

type SetOptional<T, Keys extends keyof T> = Omit<T, Keys> &
  Partial<Pick<T, Keys>>;

type SetRequired<T, Keys extends keyof T> = Omit<T, Keys> &
  Required<Pick<T, Keys>>;
