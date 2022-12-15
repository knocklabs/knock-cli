import { Flags, Interfaces } from '@oclif/core'
import { pick } from 'lodash'

export const paginationFlags = {
  after: Flags.string(),
  before: Flags.string(),
  limit: Flags.integer({max: 100}),
}

export const toPaginationParams = (flags: Pick<Interfaces.ParserOutput, | "flags">) => {
  return pick(flags, Object.keys(paginationFlags))
}
