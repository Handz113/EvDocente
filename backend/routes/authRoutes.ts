import { Router } from "express"
import { login, solicitarRecuperacion } from "../controllers/authController"

const router = Router()

/** POST /api/auth/login — pública, devuelve el JWT */
router.post("/login", login)

/** POST /api/auth/recuperar-password — pública, solicita enlace de recuperación */
router.post("/recuperar-password", solicitarRecuperacion)

export default router
