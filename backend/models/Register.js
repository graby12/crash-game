const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const registerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minLength: 5,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: function (value) {
          const cleanValue = value.replace(/\D/g, "");
          return cleanValue.length === 10;
        },
        message: "Phone number must be exactly 10 digits",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6, // regex validation is done in routes/register.js
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Hash password before saving
registerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Register = mongoose.model("Register", registerSchema);
module.exports = Register;
