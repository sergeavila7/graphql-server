const { ApolloServer, gql } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');

const connectDB = require('./config/db');

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'enviroments.env' });

// Conectar a la DB
connectDB();

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers['authorization'] || '';
    if (token) {
      try {
        const user = jwt.verify(
          token.replace('Bearer ', ''),
          process.env.SECRET
        );
        // console.log(user);
        return { user };
      } catch (error) {
        console.log('Hubo un error');
        console.log(error);
      }
    }
  },
});

// Arrancar el servidor
server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`Servidor listo en la URL ${url}`);
});
