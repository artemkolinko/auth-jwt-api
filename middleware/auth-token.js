const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  try {
    const payload =  await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.name = payload.name;

    next();
  } catch (error) {
    return res.status(403).json({err: error.message})
  }
}