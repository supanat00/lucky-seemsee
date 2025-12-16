import buttonBless from '../assets/buttons/button01.png'
import buttonShake from '../assets/buttons/button02.png'

function HomeScreen({ onHorse, onShake, cameraError }) {
    return (
        <div className="app-root home-root">
            <div className="home-container">
                <div className="cta-buttons">
                    <button className="image-button" type="button" onClick={onHorse}>
                        <img src={buttonBless} alt="รับพรจากม้าไฟ" />
                    </button>
                    <button className="image-button" type="button" onClick={onShake}>
                        <img src={buttonShake} alt="เสี่ยงเซียมซี" />
                    </button>
                </div>
                {cameraError && <span className="error-text">{cameraError}</span>}
            </div>
        </div>
    )
}

export default HomeScreen

