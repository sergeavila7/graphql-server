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

const whitelist = [process.env.FRONTEND_URL];
const corsOptions = {
  origin: (origin, callback) => {
    console.log(origin);
    // Verificar si la peticion proviene de un servidor de la lista
    const verify = whitelist.some((dominio) => dominio === origin);
    if (verify) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
};

// Habilitar cors
app.use(cors(corsOptions));
// Arrancar el servidor
server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`Servidor listo en la URL ${url}`);
});
