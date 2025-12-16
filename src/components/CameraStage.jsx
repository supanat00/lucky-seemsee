function CameraStage({ videoRef, showOverlay = false, children }) {
    return (
        <div className="camera-stage">
            <video
                ref={videoRef}
                className="camera-feed"
                autoPlay
                muted
                playsInline
            />
            {showOverlay && <div className="camera-overlay" />}
            {children}
        </div>
    )
}

export default CameraStage

