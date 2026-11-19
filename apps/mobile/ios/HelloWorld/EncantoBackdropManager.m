#import <React/RCTViewManager.h>
#import <UIKit/UIKit.h>

@interface EncantoBackdropManager : RCTViewManager
@end

@implementation EncantoBackdropManager

RCT_EXPORT_MODULE(EncantoBackdrop)

- (UIView *)view
{
  // Aplico el efecto del sistema al contenido detrás del diálogo.
  UIVisualEffectView *backdrop = [[UIVisualEffectView alloc]
    initWithEffect:[UIBlurEffect effectWithStyle:UIBlurEffectStyleRegular]];
  backdrop.userInteractionEnabled = NO;
  return backdrop;
}

@end
