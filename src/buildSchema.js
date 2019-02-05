import { buildASTSchema } from 'graphql'
import { addResolveFunctionsToSchema } from 'graphql-tools'

import getResolvers from './getResolvers'

export default function buildSchema (
  ast,
  server
) {
  const schema = buildASTSchema(ast)
  const resolvers = getResolvers(schema, server.relay)
  addResolveFunctionsToSchema({
    schema,
    resolvers
  });
  return schema
}
