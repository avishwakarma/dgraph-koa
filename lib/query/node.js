import { GraphQLError } from 'graphql';

import invariant from 'invariant';
import query from './query';


export default function resolve (
  source,
  args,
  context,
  info
) {
  return query(source, context, info).then(result => {
    invariant(info.path && info.path.key, 'No path')
    let nodes = result[String(info.path.key)] || []
    nodes = nodes.filter(node => !!node.__typename)
    const node = nodes[0]
    if (args.id && !node) {
      throw new GraphQLError(`There is no 'Node' with id '${args.id}'`)
    }
    return node
  })
}
