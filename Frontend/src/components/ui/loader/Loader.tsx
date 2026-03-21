import React from 'react';
import './Loader.css';

const Loader: React.FC = () => {
    return (
        <div className="loader-container">
            <div className="loader-content">
                <h2 className="loader-title">Trobyx</h2>
                <div className="loading-bar">
                    <div className="loading-bar--progress">
                        <span className="first"></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span className="last"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Loader;
