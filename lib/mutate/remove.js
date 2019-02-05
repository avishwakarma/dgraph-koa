import { Mutation } from 'dgraph-js';
import payloadQuery from '../query/payload';


export default function resolve (
  type,
  fieldName,
  source,
  args,
  context,
  info
) {
  const input = args.input
  const subject = input.id
  const values = input[fieldName].map(node => node.id)
  const reversePredicate = context.server.getReversePredicate(fieldName)
  let deletes = ''
  values.forEach(id => {
    deletes += `  <${subject}> <${fieldName}> <${id}> .\n`
    if (reversePredicate) {
      deletes += `  <${id}> <${reversePredicate}> <${subject}> .\n`
    }
  })
  const mutation = new Mutation()
  mutation.setDelNquads(new Uint8Array(new Buffer.from(deletes)))
  return context.server.mutate(mutation).then(() => {
    return payloadQuery(info, context, subject, input.clientMutationId)
  })
}
