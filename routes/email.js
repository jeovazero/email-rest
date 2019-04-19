const mongoose = require('mongoose')
const User = require('../models/user')

const argon2 = require('argon2')

const MONGO_URL = process.env.MONGO_URL
const jwt = require('jsonwebtoken')

const SECRET = process.env.SECRET
console.log(MONGO_URL)

mongoose.connect(MONGO_URL, function (err, res) {
  if (err) {
    console.log('ERROR connecting to: ' + MONGO_URL + '. ' + err)
  } else {
    console.log('Succeeded connected to: ' + MONGO_URL)
  }
})

function getBox (req, res, typebox) {
  let email = req.user

  User.findOne({ email: email })
    .then(user => {
      if (user) {
        res.send({
          success: true,
          code: 200,
          message: typebox,
          data: typebox === 'inbox' ? user.inbox : user.outbox
        })
      } else {
        // Se tudo estiver certo esse erro nunca vai ser lancado
        res.send({
          success: false,
          code: 493,
          message: 'Usuario não encontrado'
        })
      }
    })
    .catch(e => {
      console.log(e)
      res.send({
        success: false,
        code: 590,
        message: 'Erro no Database, talvez'
      })
    })
}

module.exports = function (server) {
  server.post('/register', function (req, res, next) {
    argon2.hash(req.body.password).then(hash => {
      let name = req.body.name

      let password = hash

      let email = req.body.email
      let user = new User({ name, password, email })

      user
        .save()
        .then(() => {
          res.send({
            success: true,
            code: 200,
            message: 'Usuario registrado'
          })
        })
        .catch(e => {
          console.log(e)
          // Mensagem provisoria
          res.send({
            success: false,
            code: 490,
            message: 'Usuario ja registrado'
          })
        })
    })

    return next()
  })

  server.post('/login', function (req, res, next) {
    let email = req.body.email

    let password = req.body.password
    console.log('login', email, password)
    User.findOne({ email: email })
      .then(user => {
        if (user && user.verifyPasswd(password)) {
          res.send({
            success: true,
            code: 200,
            message: 'Logado, o/',
            token: jwt.sign({ user: user.email }, Buffer.from(SECRET), {
              expiresIn: 120
            })
          })
        } else {
          res.send({
            success: false,
            code: 491,
            message: 'Usuario e/ou senha errados'
          })
        }
      })
      .catch(e => {
        console.log(e)
        res.send({
          success: false,
          code: 590,
          message: 'Erro no Database, talvez'
        })
      })
    return next()
  })

  server.get('/email/inbox', function (req, res, next) {
    if (req.user === null) {
      res.send({
        success: false,
        code: 492,
        message: 'Usuario nao autenticado'
      })
    } else {
      getBox(req, res, 'inbox')
    }
    return next()
  })

  server.get('/email/outbox', function (req, res, next) {
    if (req.user === null) {
      res.send({
        success: false,
        code: 492,
        message: 'Usuario nao autenticado'
      })
    } else {
      getBox(req, res, 'outbox')
    }
    return next()
  })

  server.put('/email/send', function (req, res, next) {
    if (req.user === null) {
      res.send({
        success: false,
        code: 492,
        message: 'Usuario nao autenticado'
      })
    } else {
      let from = req.user

      let to = req.body.to

      let subject = req.body.subject

      let body = req.body.body

      let read = false

      let type = req.body.type

      User.findOne({ email: from }).then(remet => {
        User.findOne({ email: to }).then(dest => {
          if (dest) {
            let message = {
              from,
              to,
              subject,
              body,
              read
            }

            switch (type) {
              case 'R':
                message.subject = 'RE: ' + message.subject
                break
              case 'F':
                message.subject = 'FWD: ' + message.subject
                break
              case 'N':
                break
              default:
                res.send({
                  success: false,
                  code: 496,
                  message: 'Tipo de mensagem invalido'
                })
            }
            remet.outbox.push(message)
            dest.inbox.push(message)
            remet
              .save()
              .then(() => {
                dest.save().then(() => {
                  res.send({
                    success: true,
                    code: 200,
                    message: 'Enviado com sucesso'
                  })
                })
              })
              .catch(e => {
                console.log(e)
                res.send({
                  success: false,
                  code: 590,
                  message: 'Erro no Database, talvez'
                })
              })
          } else {
            res.send({
              success: false,
              code: 495,
              message: 'Destinatario nao encontrado'
            })
            return next()
          }
        })
      })
    }
    return next()
  })

  server.del('/email/del/:box/:id', function (req, res, next) {
    if (req.user === null) {
      res.send({
        success: false,
        code: 492,
        message: 'Usuario nao autenticado'
      })
    } else {
      let id = req.params.id
      let type = req.params.box
      if (type !== 'inbox' && type !== 'outbox') {
        res.send({
          success: false,
          code: 487,
          message: 'Tipo de caixa invalido'
        })
        return next()
      }

      User.findOne({ email: req.user }).then(user => {
        user[type].id(id).remove()
        user.save(err => {
          if (err) {
            console.log(err)
            res.send({
              success: false,
              code: 590,
              message: 'Erro no Database, talvez'
            })
          } else {
            res.send({
              success: true,
              code: 200,
              message: 'Mensagem removida com sucesso!',
              data: user[type]
            })
          }
        })
      })
    }
    return next()
  })

  server.put('/email/open/:box/:id', function (req, res, next) {
    if (req.user === null) {
      res.send({
        success: false,
        code: 492,
        message: 'Usuario nao autenticado'
      })
    } else {
      let id = req.params.id
      let type = req.params.box
      if (type !== 'inbox' && type !== 'outbox') {
        res.send({
          success: false,
          code: 487,
          message: 'Tipo de caixa invalido'
        })
        return next()
      }

      User.findOne({ email: req.user }).then(user => {
        console.log(id, type)
        user[type].id(id).read = true
        console.log('Found:', user[type].id(id))
        user.save(err => {
          if (err) {
            console.log(err)
            res.send({
              success: false,
              code: 590,
              message: 'Erro no Database, talvez'
            })
          } else {
            res.send({
              success: true,
              code: 200,
              message: 'Mensagem aberta com sucesso!',
              data: user[type]
            })
          }
        })
      })
    }
    return next()
  })
}
