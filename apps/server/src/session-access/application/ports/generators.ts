/** Random 9-digit session codes (not starting with 0), from a CSPRNG. */
export interface CodeGenerator {
  next(): string;
}

/** Random 6-digit OTPs, from a CSPRNG. */
export interface OtpGenerator {
  next(): string;
}

export interface IdGenerator {
  uuid(): string;
}

export interface Clock {
  now(): Date;
}
