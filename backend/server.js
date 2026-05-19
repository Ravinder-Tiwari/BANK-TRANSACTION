require("dotenv").config()
const app = require("./src/app")
const connectToDb = require("./src/config/db")

connectToDb()

const PORT = process.env.PORT || 5000
app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})

    