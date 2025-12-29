import React, { useState } from 'react';

const PasswordDialog = ({ mode, onConfirm, onCancel }) => {
    const [password, setPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        // Wait for async confirm (encryption/decryption)
        await onConfirm(password);
        setIsProcessing(false);
    };

    return (
        <div className="pwd-dialog-overlay" onClick={!isProcessing ? onCancel : undefined}>
            <div className="pwd-dialog-content" onClick={e => e.stopPropagation()}>
                <h3 className="pwd-title">
                    {mode === 'export' ? 'Encrypt Backup' : 'Unlock Backup'}
                </h3>
                <p className="pwd-desc">
                    {mode === 'export'
                        ? 'Set a password to encrypt this file. Leave empty for no encryption.'
                        : 'This file is encrypted. Please enter the password.'}
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        className="pwd-input"
                        placeholder={mode === 'export' ? "Password (Optional)" : "Enter Password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoFocus
                        disabled={isProcessing}
                    />

                    <div className="pwd-actions">
                        <button
                            type="button"
                            className="pwd-btn cancel"
                            onClick={onCancel}
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pwd-btn confirm"
                            disabled={isProcessing}
                        >
                            {isProcessing ? 'Processing...' : (mode === 'export' ? 'Download' : 'Unlock')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordDialog;
