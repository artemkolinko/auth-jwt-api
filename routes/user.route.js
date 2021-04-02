const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authToken = require('../middleware/auth-token');

router.route('/')
  .get(authToken, userController.getUsers)
  .post(userController.createUser);

router.route('/login')
  .post(userController.loginUser);
  
router.route('/logout')
  .post(userController.logoutUser);

router.route('/refresh')
  .post(userController.refreshToken);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.editUser)
  .delete(userController.deleteUser);

module.exports = router;