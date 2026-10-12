import ryanMullinWordmark from '../assets/ryanMullinWordmark.png';
import { easeIn, easeSignature, easeStandard, progress } from '../timing';
import type { ShotContext, ShotModule } from './shotTypes';

const legalStrings = import.meta.glob<{ default: { legal: { terms: Record<string, string> } } }>('../../../../apps/docs/src/i18n/strings/*.json', { eager: true });

// The Lattice mark as the parent site draws it: eight ellipses a sixteenth of a turn apart, each
// stroke drawing itself on a stagger (latticeandcompany.github.io, rosette.tsx).
const rosetteRotations = Array.from({ length: 8 }, (_, index) => index * 22.5);
const strokeSeconds = 0.9;
const strokeStagger = 0.72 / 8;
const markStroke = '#FBF8FF';

const fadeOutSeconds = 0.4;

const Rosette = ({ size, local }: { size: number; local: number }) => (
	<svg viewBox='60 60 580 580' style={{ width: size, height: size, overflow: 'visible' }} aria-hidden='true'>
		{rosetteRotations.map((rotation, index) => {
			const drawn = easeStandard(progress(local, index * strokeStagger, index * strokeStagger + strokeSeconds));
			return (
				<ellipse
					key={rotation}
					cx={350}
					cy={350}
					rx={250}
					ry={95}
					pathLength={1}
					transform={`rotate(${rotation} 350 350)`}
					fill='none'
					stroke={markStroke}
					strokeWidth={15.635}
					strokeLinecap='round'
					strokeDasharray='1 1'
					strokeDashoffset={1 - drawn}
				/>
			);
		})}
	</svg>
);

const leaving = (ctx: ShotContext) => 1 - easeIn(progress(ctx.local, ctx.shot.to - ctx.shot.from - fadeOutSeconds, ctx.shot.to - ctx.shot.from));

// The parent company on a slide of its own: the rosette draws, then the name comes in beside it.
const Lattice = ({ ctx }: { ctx: ShotContext }) => {
	const wordSize = ctx.format === 'portrait' ? 76 : 84;
	const word = easeSignature(progress(ctx.local, 0.8, 1.4));
	return (
		<div className='credits' style={{ opacity: leaving(ctx) }}>
			<div className='credits-lattice'>
				<Rosette size={wordSize * 1.35} local={ctx.local - 0.25} />
				<span className='credits-lattice-word' style={{ fontSize: wordSize, opacity: word }}>
					Lattice <span className='credits-lattice-amp'>&amp;</span> Company
				</span>
			</div>
		</div>
	);
};

export const credits: ShotModule = { Component: Lattice };

const Signature = ({ ctx }: { ctx: ShotContext }) => {
	const arrive = easeSignature(progress(ctx.local, 0.15, 0.75));
	return (
		<div className={`credits${ctx.format === 'portrait' ? ' is-portrait' : ''}`} style={{ opacity: leaving(ctx) }}>
			<img className='credits-signature' src={ryanMullinWordmark} alt='Ryan Mullin' style={{ opacity: arrive, transform: `translateY(${(1 - arrive) * 12}px)` }} />
		</div>
	);
};

export const signature: ShotModule = { Component: Signature };

// The site's own disclaimers, in the film's locale, word for word.
const legalSections = ['affiliation', 'notStreaming', 'thirdParty', 'estimate', 'warranty', 'availability'] as const;
const links: Partial<Record<(typeof legalSections)[number], string>> = { estimate: 'estimateLink', warranty: 'warrantyLink' };

const termsFor = () => {
	const locale = document.documentElement.lang || 'en';
	const strings = legalStrings[`../../../../apps/docs/src/i18n/strings/${locale}.json`] ?? legalStrings['../../../../apps/docs/src/i18n/strings/en.json']!;
	return strings.default.legal.terms;
};

const Legal = ({ ctx }: { ctx: ShotContext }) => {
	const terms = termsFor();
	const arrive = easeSignature(progress(ctx.local, 0.1, 0.6));
	return (
		<div className={`legal${ctx.format === 'portrait' ? ' is-portrait' : ''}`} style={{ opacity: arrive }}>
			{legalSections.map(section => {
				const link = links[section];
				const body = terms[`${section}1`]!.replace('{link}', link ? terms[link]! : '');
				return (
					<section key={section} className='legal-section'>
						<h2 className='legal-heading'>{terms[`${section}Heading`]}</h2>
						<p className='legal-body'>{body}</p>
					</section>
				);
			})}
		</div>
	);
};

export const legal: ShotModule = { Component: Legal };
