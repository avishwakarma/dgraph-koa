import { Mutation } from 'dgraph-js';
import getMutation from './getMutation';
import payloadQuery from '../query/payload';

export default function resolve (
  type,
  predicate,
  source,
  args,
  context,
  info
) {
  const input = args.input
  const subject = input.id
  const valueInput = input[predicate]
  const value = valueInput && valueInput.id
  const reverse = context.server.getReversePredicate(predicate)
  let query = '{\n'
  query += `  subject(func:uid(${subject})) { ${predicate} { uid }}\n`
  if (typeof value !== 'undefined') {
    query += `value(func:uid(${value})) { uid __typename`
    if (reverse) {
      query += ` ${reverse} { uid }`
    }
    query += '}\n'
  }
  query += '}'
  return context.server
    .query(query)
    .then(result => {
      const subjectNode = result.subject && result.subject[0]
      const valueNode = result.value && result.value[0]
      const types = {}
      if (valueNode) {
        types[valueNode.uid] = valueNode.__typename
      }
      let subjectEdge = subjectNode && subjectNode[predicate][0].uid
      let valueEdge =
        reverse && valueNode && valueNode[reverse] && valueNode[reverse][0].uid

      const mutation = new Mutation()
      if ((subjectEdge || valueEdge) && subjectEdge !== value) {
        let deletes = ''
        if (subjectEdge) {
          deletes += `<${subject}> <${predicate}> <${subjectEdge}> .\n`
          if (reverse) {
            deletes += `<${subjectEdge}> <${reverse}> <${subject}> .\n`
          }
        }
        if (value && valueEdge) {
          deletes += `<${value}> <${predicate}> <${valueEdge}> .\n`
          if (reverse) {
            deletes += `<${valueEdge}> <${reverse}> <${value}> .\n`
          }
        }
        mutation.setDelNquads(new Uint8Array(new Buffer.from(deletes)))
      }

      if (valueInput) {
        const sets = getMutation(context, type, input, `<${subject}>`, types)
        mutation.setSetNquads(new Uint8Array(new Buffer.from(sets)))
      }

      return context.server.mutate(mutation)
    })
    .then(() => {
      return payloadQuery(info, context, subject, input.clientMutationId)
    })
}
