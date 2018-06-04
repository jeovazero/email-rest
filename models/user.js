const mongoose = require('mongoose')
const Schema = mongoose.Schema
const argon2 = require('argon2')
const Message = require('./messageSchema.js')

const UsersSchema = new Schema({
    name: {
		type: String,
		require: true,
	},
	password: {
        type: String,
        require: true,
    },
    email: { 
		type: String,
		unique: true,
		require: true,
	},
	inbox : { 
		type: [Message],
		default: []
	},
	outbox : { 
		type: [Message],
		default: []
	}
});

UsersSchema.methods.verifyPasswd = function(passwd){
	return argon2.hash(passwd)
	.then( hash => {
		return hash == this.password
	})
}

module.exports = mongoose.model('User', UsersSchema);
