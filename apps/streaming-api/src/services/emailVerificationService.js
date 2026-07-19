const crypto = require('crypto');
const { query } = require('../config/database');

class EmailVerificationService {
    /**
     * Generate a verification token for a user
     */
    static async createVerificationToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');

        // Invalidate any existing tokens for this user
        await query(
            'DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL',
            [userId]
        );

        await query(
            `INSERT INTO email_verification_tokens (user_id, token, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
            [userId, token]
        );

        return token;
    }

    /**
     * Verify an email verification token
     */
    static async verifyToken(token) {
        const result = await query(
            `SELECT evt.*, u.email, u.username
             FROM email_verification_tokens evt
             JOIN users u ON evt.user_id = u.id
             WHERE evt.token = $1
               AND evt.expires_at > NOW()
               AND evt.used_at IS NULL`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const record = result.rows[0];

        // Mark token as used
        await query(
            'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
            [record.id]
        );

        // Mark user as verified
        await query(
            'UPDATE users SET verified = true, updated_at = NOW() WHERE id = $1',
            [record.user_id]
        );

        return record;
    }

    /**
     * Generate a password reset token
     */
    static async createPasswordResetToken(email) {
        const userResult = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            // Don't reveal if email exists
            return null;
        }

        const userId = userResult.rows[0].id;
        const token = crypto.randomBytes(32).toString('hex');

        // Invalidate existing tokens
        await query(
            'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL',
            [userId]
        );

        await query(
            `INSERT INTO password_reset_tokens (user_id, token, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
            [userId, token]
        );

        return { token, userId };
    }

    /**
     * Verify a password reset token
     */
    static async verifyResetToken(token) {
        const result = await query(
            `SELECT prt.*, u.email
             FROM password_reset_tokens prt
             JOIN users u ON prt.user_id = u.id
             WHERE prt.token = $1
               AND prt.expires_at > NOW()
               AND prt.used_at IS NULL`,
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * Mark reset token as used
     */
    static async markResetTokenUsed(tokenId) {
        await query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
            [tokenId]
        );
    }
}

module.exports = EmailVerificationService;
