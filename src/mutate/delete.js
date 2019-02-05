import { Mutation } from 'dgraph-js';
import { GraphQLObjectType, GraphQLList, GraphQLError } from 'graphql';

import payloadQuery from '../query/payload';
import { getFields, unwrap } from '../utils';


export default function resolve (
  type,
  source,
  args,
  context,
  info
) {
  const server = context.server
  const id = args.input.id
  // TODO: should merge payload and edge queries here
  return payloadQuery(info, context, id, args.input.clientMutationId).then(
    payload => {
      if (payload === null) {
        throw new GraphQLError(`There is no '${type.name}' with id '${id}'`)
      }

      let edgeQuery = `{ node(func:uid(${id})) {\n  __typename\n`
      getFields(type).forEach(field => {
        const fieldType = unwrap(field.type)
        if (
          fieldType instanceof GraphQLObjectType ||
          fieldType instanceof GraphQLList
        ) {
          edgeQuery += '  ' + field.name + ' { uid }\n'
        }
      })
      edgeQuery += '}}'

      return server
        .query(edgeQuery)
        .then(edges => {
          const subject = edges.node[0]
          let deletes = `<${id}> * * .\n`
          Object.keys(subject).forEach(key => {
            const results = subject[key]
            const reverse = server.getReversePredicate(key)
            if (reverse && Array.isArray(results)) {
              results.forEach(node => {
                deletes += `<${node.uid}> <${reverse}> <${id}> .\n`
              })
            }
          })
          const mutation = new Mutation()
          mutation.setDelNquads(new Uint8Array(new Buffer.from(deletes)))
          return server.mutate(mutation)
        })
        .then(() => payload)
    }
  )
}
