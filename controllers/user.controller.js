const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');

// Access token for 20 seconds
const generateAccessToken = async (payload) => await jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '20s'});

const generateRefreshToken = async (payload) => await jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET);

// Should move to DB
let refreshTokens = [];

class UserController {
  async getUsers (req, res) {
    const { name } = req;
    
    try {
      // get only auth user
      const users = await db.query('SELECT * FROM users WHERE name = $1', [name]);
      res.json(users.rows);
    } catch (error) {
      res.status(404).json({err: error.message});
    }
  }

  async createUser (req, res) {
    const { name, password } = req.body;
    const id = uuidv4();

    try {
      if (!name || name.length >= 20) throw new Error('Name should be string up to 20 characters');

      if (!password || password.length < 6 || password.length > 30) throw new Error('Password should be string from 6 to 30 characters');

      // salt = 10
      const hashedPassword = await bcrypt.hash(password.trim(), 10);

      const newPerson = await db.query('INSERT INTO users (id, name, password) values ($1, $2, $3) RETURNING *', [id, name, hashedPassword]);

      // create jwt token
      const payload = {id: newPerson.rows[0].id, name: newPerson.rows[0].name}
      const accessToken = await generateAccessToken(payload);

      // create refresh token and save to DB (!now in local array!)
      const refreshToken = await generateRefreshToken(payload);
      refreshTokens.push(refreshToken);

      // Return access and refresh token
      res.status(201).json({accessToken, refreshToken});
    } catch (error) {
      res.status(400).json({err: error.message})
    }
  }

  // POST /login
  async loginUser (req, res) {
    const name = req.body.name && req.body.name.trim();
    const password = req.body.password && req.body.password.trim();
    // const { name, password } = req.body;

    try {
      // validate name
      if (!name || name.length >= 20) throw new Error('Name should be string up to 20 characters');

      // validate password
      if (!password || password.length < 6 || password.length > 30) throw new Error('Password should be string from 6 to 30 characters');

      // find user
      const user = await db.query('SELECT * FROM users WHERE name = $1', [name]);

      if (!user.rowCount) throw new Error('User not found');

      // check password
      const isPasswordsCorrect = await bcrypt.compare(password, user.rows[0].password);

      if (!isPasswordsCorrect) throw new Error('Incorrect password');

      // create jwt token
      const payload = {id: user.rows[0].id, name: user.rows[0].name}
      const accessToken = await generateAccessToken(payload);

      // create refresh token and save to DB (!now in local array!)
      const refreshToken = await generateRefreshToken(payload);
      refreshTokens.push(refreshToken);
      
      // Return access and refresh token
      res.json({accessToken, refreshToken});

    } catch (error) {
      res.status(404).json({err: error.message});
    }
  }

  // POST /refresh
  async refreshToken (req, res) {
    const rfToken = req.body.rftoken;
    // Checks
    if (!rfToken) return res.sendStatus(401);

    // Do we have refresh token or we have deleted it?
    if (!refreshTokens.includes(rfToken)) return res.sendStatus(403);

    try {
      const payload = await jwt.verify(rfToken, process.env.REFRESH_TOKEN_SECRET);

      // Lets create a new access token
      // it will be not equil because previous has 'iat' key
      const accessToken = await generateAccessToken({
        id: payload.id,
        name: payload.name
      });
      // Илья Климов - should send new pair of accessToken and refreshToken? Old refreshToken become invalide! 

      // Если хакер использовал refreshToken, то юзер уже не сможет использовать его повторно, поэтому перелогинивается и получает новую пару.
      res.json({accessToken});
    } catch (error) {
      res.sendStatus(403);
    }
  }

  // DELETE /logout
  // отзываем refresh token и хакер не сможет получить новый access token или втовой вариант, как предлагает Илья Климов - это каждый раз при обновлении acceess токена выдавать новый refresh токен, а старый удалять.
  async logoutUser (req, res) {
    // delete refresh token from DB (for now from local array)
    refreshTokens = refreshTokens.filter(token => token !== req.body.rftoken);

    res.sendStatus(204);
  }

  async getUser (req, res) {
    const { id } = req.params;

    try {
      if (!uuidValidate(id)) throw new Error('Invalid id');

      const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);

      if (!user.rowCount) {
        res.status(404).json({err: 'User not found'});
      }

      res.json(user.rows[0]);
    } catch (error) {
      res.status(404).json({err: error.message})
    }
  }

  async editUser (req, res) {
    const { id } = req.params;
    const { name }  = req.body;

    try {
      
      if (!uuidValidate(id)) throw new Error('Invalid id');

      if (!name || name.length >= 20) throw new Error('Name should be string up to 20 characters');

      const user = await db.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING *', [name, id]);

      if (!user.rowCount) throw new Error('User not found');

      res.json(user.rows[0]);
    } catch (error) {
      res.status(404).json({err: error.message})
    }
  }

  async deleteUser (req, res) {
    const { id } = req.params;

    try {
      if (!uuidValidate(id)) throw new Error('Invalid id');

      const user = await db.query('DELETE FROM users WHERE id = $1', [id]);

      if (!user.rowCount) throw new Error('User not found');

      res.json({message: `User with id ${id} successfuly deleted`});
    } catch (error) {
      res.status(404).json({err: error.message})
    }
  }
}

module.exports = new UserController();