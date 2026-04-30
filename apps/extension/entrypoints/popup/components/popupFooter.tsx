interface popupFooterProps {
	hasEspnBranding: boolean;
}

const popupFooter = ({ hasEspnBranding }: popupFooterProps) => (
	<div className='mt-auto'>

		<div className='popup-signature-bar'>
			Built with ❤️ by Ryan Mullin
		</div>
	</div>
);

export default popupFooter;
