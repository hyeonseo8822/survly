function NavBar() {
    return (
        <div className='navbar'>
            <img className="logobox" src={`${process.env.PUBLIC_URL}/img/logobox.svg`} alt="logo" />
            <div className="items">
                <p className='nav'>Create</p>
                <p className='nav'>Search</p>
                <p className='nav'>Result</p>
                <p className='nav'>Login</p>
            </div>
        </div>
    )

}

export default NavBar