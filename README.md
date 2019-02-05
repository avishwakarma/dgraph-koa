# DgraphKoa
Build a GraphQL application using Dgraph and Koa


## Introduction

Dgraph is a distributed, highly available graph database that uses a language
similar to GraphQL to query and mutate data. Unlike GraphQL, Dgraph only defines
schema for predicates (properties) within the graph; there is no concept of
complex types or groups of properties. Because of this it is straight forward to
store any GraphQL schema in Dgraph provided a few restrictions are met.

Given a GraphQL schema, DgraphKoa can do four things:

1. Generate a GraphQL-JS schema that maps GraphQL queries to Dgraph queries
2. Transform Dgraph responses into GraphQL responses (including support for the
   relay connection specification)
3. Generate defaults for create/update/delete/query operations (with filtering,
   ordering and nested create/update mutations)
4. Configure Dgraph's schema with types and indexes each property.


## Getting Started

The [example](https://github.com/ashokvishwakarma/dgraph-koa/tree/master/example) describes
basic usage. First, install dependencies:

```sh
npm install
```

## Using DgraphKoa

Install DgraphQL from npm


```sh
npm install dgraph-koa
```

The entry point to the library is `Server`

```javascript
import { Server } from 'dgraph-koa'

const schema = `
type Person {
  id: ID!
  name: String @filter(types: [EQUALITY])
  children: [Person!]! @reverse(name: "parents")
  parents: [Person!]! @reverse(name: "children")
}`

(async () => {
  const server = new Server({
    debug: true,
    relay: false,
    graphiql: true, // enable Graphiql UI
    graphiqlUrl: '/graphql', // URL for graphql middleware
    dgraph: {
      uri: 'localhost:9080' // Dgraph database uri
    }
  });

  server.updateSchema(schema);

  server.listen(4000, '0.0.0.0', () => {
    console.log("Server started at http://0.0.0.0:4000")
  });
})();
```

### config
DgraphKoa config passed in `Server constructor`

```
debug: boolean // default true
relay: boolean // default false
graphiql: boolean // default true
graphiqlUrl: string // degault /graphql
dgraph: {
  url: string // default localhost:9080,
  credentials: grpc // default grpc.credentials.createInsecure()
}
```

### Adding other routes
The DgraphKoa allow you to add more middlewares and routing rules into the Koa application

```javascript
const server = new Server(...config);

// server.app actual Koa app

server.app.use(
  // middleware
);

server.use(
  // routing rules
);

server.listen(
  // port
  // host
  // callback
)
```

### Special Thanks
[David Peek](https://github.com/dpeek) for his [dgaphql](https://github.com/dpeek/dgraphql) github repo.

