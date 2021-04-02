require('dotenv').config()
const express = require('express');
const userRouter = require('./routes/user.route');
const PORT = process.env.PORT || 4000;

const app = express();

// parse only json
app.use(express.json());

app.use('/', userRouter);

app.listen(PORT, () => {
  console.log('Server has been started on port ' + PORT);
});