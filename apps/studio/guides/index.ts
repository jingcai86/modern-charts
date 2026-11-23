import type { MCBaseChart, ThemeModePreference } from '../../../src/index';
import { renderGuideHeader } from './shared';
import { renderCustomLayersGuide } from './custom-layers';
import { renderThemesGuide } from './themes';
import { renderD3Guide } from './d3';
import { renderCustomLabelsGuide } from './custom-labels';
import { renderTooltipsGuide } from './tooltips';
import { renderPatternsGuide } from './patterns';
import type { GuideId } from './types';

export { GUIDES_CATALOG, type GuideId, type GuideMeta } from './types';

export function renderGuidePage(
  root: HTMLElement,
  guideId: GuideId,
  themeMode: ThemeModePreference
): MCBaseChart<any>[] {
  root.innerHTML = '';
  root.appendChild(renderGuideHeader(guideId));

  const body = document.createElement('div');
  body.className = 'guide-body-stack';
  root.appendChild(body);

  switch (guideId) {
    case 'custom-layers':
      return renderCustomLayersGuide(body, themeMode);
    case 'themes':
      return renderThemesGuide(body, themeMode);
    case 'd3':
      return renderD3Guide(body, themeMode);
    case 'custom-labels':
      return renderCustomLabelsGuide(body, themeMode);
    case 'tooltips':
      return renderTooltipsGuide(body, themeMode);
    case 'patterns':
      return renderPatternsGuide(body, themeMode);
  }
}
