import { Server } from '../lib/';

const schema = `
type Person {
  id: ID!
  name: String @filter(types: [EQUALITY])
  children: [Person!]! @reverse(name: "parents")
  parents: [Person!]! @reverse(name: "children")
}`;

(async () => {

  const server = new Server({
    debug: true,
    relay: false,
    graphiql: true,
    graphiqlUrl: '/graphql',
    dgraph: {
      uri: 'localhost:9080'
    }
  });
  
  await server.updateSchema(schema);

  server.listen(4000);
})();

