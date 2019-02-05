import { Mutation } from 'dgraph-js';
import getMutation from './getMutation';
import payloadQuery from '../query/payload';

export default function resolve (
  type,
  source,
  args,
  context,
  info
) {
  const input = args.input
  return getTypes(input, context).then(types => {
    const subject = input.id ? `<${input.id}>` : '_:node'
    const sets = getMutation(context, type, input, subject, types)
    const mutation = new Mutation()
    mutation.setSetNquads(new Uint8Array(new Buffer.from(sets)))
    return context.server.mutate(mutation).then(res => {
      const uids = res.getUidsMap()
      const id = input.id || uids.get('node')
      return payloadQuery(info, context, id, input.clientMutationId)
    })
  })
}

function getTypes (
  input,
  context
) {
  const ids = getIds(input)
  if (ids.length === 0) return Promise.resolve({})
  const query = `{ nodes(func:uid(${ids.join(',')})) { uid __typename }}`
  return context.server.query(query).then(result => {
    const types = {}
    if (result.nodes) {
      result.nodes.forEach(node => (types[node.uid] = node.__typename))
    }
    return types
  })
}

function getIds (input) {
  const ids = []
  Object.keys(input).forEach(key => {
    const value = input[key]
    if (key === 'id') ids.push(String(value))
    if (typeof value === 'object') {
      getIds(value).forEach(id => ids.push(id))
    }
  })
  return ids
}
